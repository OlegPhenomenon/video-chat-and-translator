require 'rails_helper'

RSpec.describe "Videos", type: :request do
  let!(:user) { create(:user, :confirmed) }

  describe "GET /videos" do
    context "when not authenticated" do
      it "redirects to sign in" do
        get "/videos", headers: { "HTTP_HOST" => "localhost" }
        expect(response).to redirect_to(new_user_session_path)
      end
    end

    context "when authenticated" do
      before { sign_in user }

      it "returns 200" do
        get "/videos", headers: { "HTTP_HOST" => "localhost" }
        expect(response).to be_successful
      end

      it "renders the videos/Index inertia component" do
        get "/videos", headers: { "HTTP_HOST" => "localhost" }
        expect(response.body).to include("videos/Index")
      end
    end
  end

  describe "GET /videos/:id" do
    let(:video_id) { "abc-123" }

    context "when not authenticated" do
      it "redirects to sign in" do
        get "/videos/#{video_id}", headers: { "HTTP_HOST" => "localhost" }
        expect(response).to redirect_to(new_user_session_path)
      end
    end

    context "when authenticated" do
      before { sign_in user }

      it "returns 200" do
        get "/videos/#{video_id}", headers: { "HTTP_HOST" => "localhost" }
        expect(response).to be_successful
      end

      it "renders the videos/Show inertia component" do
        get "/videos/#{video_id}", headers: { "HTTP_HOST" => "localhost" }
        expect(response.body).to include("videos/Show")
      end

      it "passes the id as an inertia prop" do
        get "/videos/#{video_id}", headers: { "HTTP_HOST" => "localhost" }
        expect(response.body).to include(video_id)
      end
    end
  end
end
