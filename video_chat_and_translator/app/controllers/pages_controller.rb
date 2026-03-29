# frozen_string_literal: true

class PagesController < InertiaController
  def index
    render inertia: "Landing", props: {
      app_name: "Video Chat & Translator"
    }
  end
end
