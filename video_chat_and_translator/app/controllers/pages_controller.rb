# frozen_string_literal: true

class PagesController < InertiaController
  skip_before_action :authenticate_user!

  def index
    render inertia: "Dashboard"
  end
end
