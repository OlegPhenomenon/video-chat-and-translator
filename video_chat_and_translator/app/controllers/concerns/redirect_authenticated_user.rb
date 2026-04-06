# frozen_string_literal: true

module RedirectAuthenticatedUser
  extend ActiveSupport::Concern

  private

  def redirect_if_authenticated
    redirect_to dashboard_path if user_signed_in?
  end
end
