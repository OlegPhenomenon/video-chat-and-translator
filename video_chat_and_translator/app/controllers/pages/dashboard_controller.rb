# frozen_string_literal: true

class Pages::DashboardController < InertiaController
  skip_before_action :authenticate_user!
  before_action :require_authenticated_user

  def show
    render inertia: "Dashboard"
  end

  private

  def require_authenticated_user
    redirect_to root_path unless user_signed_in?
  end
end
