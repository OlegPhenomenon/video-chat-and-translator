require 'rails_helper'

RSpec.describe "Pages", type: :request do
  describe "GET /" do
    context "when not authenticated" do
      it "redirects to login page" do
        get "/", headers: { "HTTP_HOST" => "localhost" }
        expect(response).to redirect_to(new_user_session_path)
      end
    end

    context "when authenticated with confirmed user" do
      let!(:user) { create(:user, :confirmed) }

      before { sign_in user }

      it "renders the Dashboard inertia component" do
        get "/", headers: { "HTTP_HOST" => "localhost" }
        expect(response).to be_successful
        expect(response.body).to include("Dashboard")
      end

    end
  end
end
