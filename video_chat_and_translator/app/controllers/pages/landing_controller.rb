# frozen_string_literal: true

class Pages::LandingController < InertiaController
  skip_before_action :authenticate_user!

  def show
    render inertia: "Landing", props: {
      app_name: Rails.application.class.module_parent_name.humanize
    }
  end
end
