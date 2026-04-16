require 'rails_helper'

RSpec.describe "Users::Registrations", type: :request do
  let(:headers) { { "HTTP_HOST" => "localhost" } }

  def inertia_page
    document = Nokogiri::HTML(response.body)
    script = document.at_css('script#app') || document.css('script').find { |node| node.text.include?('"component":') }

    JSON.parse(script.text)
  end

  def inertia_props
    inertia_page.fetch("props")
  end

  describe "GET /users/sign_up" do
    context "when not authenticated" do
      it "renders the registration page" do
        get "/users/sign_up", headers: headers
        expect(response).to be_successful
        expect(inertia_props["registration_success"]).to be(false)
      end
    end

    context "when authenticated" do
      let!(:user) { create(:user, :confirmed) }

      before { sign_in user }

      it "redirects to dashboard" do
        get "/users/sign_up", headers: headers
        expect(response).to redirect_to(dashboard_path)
      end
    end
  end

  describe "POST /users" do
    let(:email) { "test-#{SecureRandom.hex(4)}@example.com" }

    let(:valid_params) do
      { user: { email: email, password: "password123", password_confirmation: "password123" } }
    end

    context "with valid params" do
      it "creates a user with unconfirmed email" do
        expect {
          post "/users", params: valid_params, headers: headers
        }.to change(User, :count).by(1)

        user = User.last
        expect(user.confirmed_at).to be_nil
      end

      it "redirects to registration page with success notice" do
        post "/users", params: valid_params, headers: headers
        expect(response).to redirect_to(new_user_registration_path)
        follow_redirect!
        expect(response).to be_successful
        expect(inertia_props["registration_success"]).to be(true)
        expect(inertia_props.dig("translations", "success_heading")).to eq(I18n.t("auth.register.success_heading"))
        expect(inertia_props.dig("translations", "success_check_email")).to eq(I18n.t("auth.register.success_check_email"))
        expect(inertia_props.dig("translations", "success_login_link")).to eq(I18n.t("auth.register.success_login_link"))
        expect(inertia_props.dig("flash", "notice")).to eq(I18n.t("auth.register.success"))
      end

      it "enqueues a confirmation email" do
        expect {
          post "/users", params: valid_params, headers: headers
        }.to have_enqueued_mail(Devise::Mailer, :confirmation_instructions)
      end

      it "shows the regular form again on a subsequent visit after flash is consumed" do
        post "/users", params: valid_params, headers: headers
        follow_redirect!

        get "/users/sign_up", headers: headers

        expect(response).to be_successful
        expect(inertia_props["registration_success"]).to be(false)
      end
    end

    context "with invalid email" do
      it "does not create a user" do
        expect {
          post "/users", params: { user: { email: "invalid", password: "password123", password_confirmation: "password123" } }, headers: headers
        }.not_to change(User, :count)
      end

      it "re-renders with registration_success false and errors" do
        post "/users", params: { user: { email: "invalid", password: "password123", password_confirmation: "password123" } }, headers: headers

        expect(response).to be_successful
        expect(inertia_props["registration_success"]).to be(false)
        expect(inertia_props["errors"]).to include("email")
      end
    end

    context "with duplicate email" do
      let!(:existing_user) { create(:user, :confirmed, email: email) }

      it "does not create a user" do
        expect {
          post "/users", params: valid_params, headers: headers
        }.not_to change(User, :count)
      end
    end

    context "with password too short" do
      it "does not create a user" do
        expect {
          post "/users", params: { user: { email: "test@example.com", password: "short", password_confirmation: "short" } }, headers: headers
        }.not_to change(User, :count)
      end
    end

    context "with mismatched passwords" do
      it "does not create a user" do
        expect {
          post "/users", params: { user: { email: "test@example.com", password: "password123", password_confirmation: "different123" } }, headers: headers
        }.not_to change(User, :count)
      end
    end
  end
end
