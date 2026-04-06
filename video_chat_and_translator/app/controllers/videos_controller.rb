# frozen_string_literal: true

class VideosController < InertiaController
  def index
    render inertia: "videos/Index"
  end

  def show
    render inertia: "videos/Show", props: { id: params[:id].to_s }
  end
end
