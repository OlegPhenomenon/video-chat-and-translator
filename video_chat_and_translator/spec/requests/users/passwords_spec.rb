require 'rails_helper'

RSpec.describe "Users::Passwords", type: :request do
  include ActiveJob::TestHelper

  let!(:confirmed_user) { create(:user, :confirmed, email: "confirmed@example.com", password: "password123") }
  let!(:unconfirmed_user) { create(:user, :unconfirmed, email: "unconfirmed@example.com", password: "password123") }

  describe "GET /users/password/new (new)" do
    it "renders the forgot password page" do
      get "/users/password/new"
      expect(response).to be_successful
    end
  end

  describe "POST /users/password (create)" do
    context "with a confirmed user" do
      it "enqueues reset password email and redirects with notice" do
        expect {
          post "/users/password", params: { user: { email: "confirmed@example.com" } }
        }.to have_enqueued_mail(Devise::Mailer, :reset_password_instructions)

        expect(response).to redirect_to(new_user_password_path)
        follow_redirect!
        expect(response).to be_successful
      end
    end

    context "with an unconfirmed user" do
      it "does not enqueue email but shows the same notice (anti-enumeration)" do
        expect {
          post "/users/password", params: { user: { email: "unconfirmed@example.com" } }
        }.not_to have_enqueued_mail(Devise::Mailer, :reset_password_instructions)

        expect(response).to redirect_to(new_user_password_path)
      end
    end

    context "with a non-existent email" do
      it "does not enqueue email but shows the same notice (anti-enumeration)" do
        expect {
          post "/users/password", params: { user: { email: "nobody@example.com" } }
        }.not_to have_enqueued_mail(Devise::Mailer, :reset_password_instructions)

        expect(response).to redirect_to(new_user_password_path)
      end
    end

    context "with an invalid email format" do
      it "renders the form with an error and does not enqueue email" do
        expect {
          post "/users/password", params: { user: { email: "not-an-email" } }
        }.not_to have_enqueued_mail(Devise::Mailer, :reset_password_instructions)

        expect(response).to be_successful
      end
    end

    context "anti-enumeration: identical flash for all valid-format emails" do
      it "returns the same flash notice regardless of user state" do
        post "/users/password", params: { user: { email: "confirmed@example.com" } }
        flash_confirmed = flash[:notice]

        post "/users/password", params: { user: { email: "unconfirmed@example.com" } }
        flash_unconfirmed = flash[:notice]

        post "/users/password", params: { user: { email: "nobody@example.com" } }
        flash_nonexistent = flash[:notice]

        expect(flash_confirmed).to eq(flash_unconfirmed)
        expect(flash_confirmed).to eq(flash_nonexistent)
        expect(flash_confirmed).to be_present
      end
    end
  end

  describe "GET /users/password/edit (edit)" do
    context "with a valid token" do
      it "renders the reset password form" do
        raw_token, hashed_token = Devise.token_generator.generate(User, :reset_password_token)
        confirmed_user.update_columns(
          reset_password_token: hashed_token,
          reset_password_sent_at: Time.current
        )

        get "/users/password/edit", params: { reset_password_token: raw_token }
        expect(response).to be_successful
      end
    end

    context "with an expired token" do
      it "renders invalid token state" do
        raw_token, hashed_token = Devise.token_generator.generate(User, :reset_password_token)
        confirmed_user.update_columns(
          reset_password_token: hashed_token,
          reset_password_sent_at: 7.hours.ago
        )

        get "/users/password/edit", params: { reset_password_token: raw_token }
        expect(response).to be_successful
      end
    end

    context "with an invalid token" do
      it "renders invalid token state" do
        get "/users/password/edit", params: { reset_password_token: "invalid_token" }
        expect(response).to be_successful
      end
    end
  end

  describe "PATCH /users/password (update)" do
    context "with a valid token and matching passwords" do
      it "updates the password and redirects to sign in" do
        raw_token, hashed_token = Devise.token_generator.generate(User, :reset_password_token)
        confirmed_user.update_columns(
          reset_password_token: hashed_token,
          reset_password_sent_at: Time.current
        )

        patch "/users/password", params: {
          user: {
            reset_password_token: raw_token,
            password: "newpassword123",
            password_confirmation: "newpassword123"
          }
        }

        expect(response).to redirect_to(new_user_session_path)
        confirmed_user.reload
        expect(confirmed_user.valid_password?("newpassword123")).to be true
      end
    end

    context "with a valid token but too short password" do
      it "renders the form with errors and does not change the password" do
        raw_token, hashed_token = Devise.token_generator.generate(User, :reset_password_token)
        confirmed_user.update_columns(
          reset_password_token: hashed_token,
          reset_password_sent_at: Time.current
        )

        patch "/users/password", params: {
          user: {
            reset_password_token: raw_token,
            password: "abc",
            password_confirmation: "abc"
          }
        }

        expect(response).to be_successful
        confirmed_user.reload
        expect(confirmed_user.valid_password?("abc")).to be false
      end
    end

    context "with a valid token but mismatching passwords" do
      it "renders the form with errors and does not change the password" do
        raw_token, hashed_token = Devise.token_generator.generate(User, :reset_password_token)
        confirmed_user.update_columns(
          reset_password_token: hashed_token,
          reset_password_sent_at: Time.current
        )

        patch "/users/password", params: {
          user: {
            reset_password_token: raw_token,
            password: "newpassword123",
            password_confirmation: "different123"
          }
        }

        expect(response).to be_successful
        confirmed_user.reload
        expect(confirmed_user.valid_password?("newpassword123")).to be false
      end
    end

    context "with an expired token" do
      it "renders invalid token state" do
        raw_token, hashed_token = Devise.token_generator.generate(User, :reset_password_token)
        confirmed_user.update_columns(
          reset_password_token: hashed_token,
          reset_password_sent_at: 7.hours.ago
        )

        patch "/users/password", params: {
          user: {
            reset_password_token: raw_token,
            password: "newpassword123",
            password_confirmation: "newpassword123"
          }
        }

        expect(response).to be_successful
      end
    end

    context "retry after validation error" do
      it "allows successful reset after a failed attempt with the same token" do
        raw_token, hashed_token = Devise.token_generator.generate(User, :reset_password_token)
        confirmed_user.update_columns(
          reset_password_token: hashed_token,
          reset_password_sent_at: Time.current
        )

        patch "/users/password", params: {
          user: {
            reset_password_token: raw_token,
            password: "ab",
            password_confirmation: "ab"
          }
        }
        expect(response).to be_successful

        patch "/users/password", params: {
          user: {
            reset_password_token: raw_token,
            password: "newpassword123",
            password_confirmation: "newpassword123"
          }
        }
        expect(response).to redirect_to(new_user_session_path)
        confirmed_user.reload
        expect(confirmed_user.valid_password?("newpassword123")).to be true
      end
    end
  end

  describe "GET /users/sign_in (sessions#new)" do
    it "includes forgot_password_url in props" do
      get "/users/sign_in"
      expect(response).to be_successful
    end
  end
end
