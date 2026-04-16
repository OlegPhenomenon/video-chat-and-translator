class Users::RegistrationsController < Devise::RegistrationsController
  include RedirectAuthenticatedUser

  skip_before_action :authenticate_user!

  def new
    redirect_if_authenticated
    return if performed?

    render inertia: "auth/Register", props: {
      translations: I18n.t("auth.register"),
      registration_success: flash[:registration_success] || false
    }
  end

  def create
    build_resource(sign_up_params)

    if resource.save
      flash[:registration_success] = true
      redirect_to new_user_registration_path,
                  notice: I18n.t("auth.register.success")
    else
      render inertia: "auth/Register", props: {
        translations: I18n.t("auth.register"),
        registration_success: false,
        errors: resource.errors.messages
      }
    end
  end

  private

  def sign_up_params
    params.require(:user).permit(:email, :password, :password_confirmation)
  end
end
