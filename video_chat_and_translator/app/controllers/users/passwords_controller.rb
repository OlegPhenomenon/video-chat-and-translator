class Users::PasswordsController < Devise::PasswordsController
  skip_before_action :authenticate_user!

  def new
    render inertia: "auth/ForgotPassword", props: {
      translations: I18n.t("auth.passwords.forgot"),
      login_url: new_user_session_path
    }
  end

  def create
    email = params.dig(:user, :email).to_s.strip

    unless email.match?(URI::MailTo::EMAIL_REGEXP)
      return render inertia: "auth/ForgotPassword", props: {
        translations: I18n.t("auth.passwords.forgot"),
        login_url: new_user_session_path,
        errors: { email: [ I18n.t("auth.errors.email_invalid") ] }
      }
    end

    user = User.find_by(email: email)
    user.send_reset_password_instructions if user&.confirmed?

    redirect_to new_user_password_path, notice: I18n.t("auth.passwords.forgot.request_accepted")
  end

  def edit
    token = params[:reset_password_token]
    user = User.with_reset_password_token(token)

    if user.nil? || !user.reset_password_period_valid?
      render inertia: "auth/ResetPassword", props: {
        translations: I18n.t("auth.passwords.reset"),
        token_state: "invalid",
        forgot_password_url: new_user_password_path
      }
    else
      render inertia: "auth/ResetPassword", props: {
        translations: I18n.t("auth.passwords.reset"),
        token_state: "valid",
        reset_password_token: token
      }
    end
  end

  def update
    token = params.dig(:user, :reset_password_token).to_s
    user = User.with_reset_password_token(token)

    if user.nil? || !user.reset_password_period_valid?
      return render inertia: "auth/ResetPassword", props: {
        translations: I18n.t("auth.passwords.reset"),
        token_state: "invalid",
        forgot_password_url: new_user_password_path
      }
    end

    if user.reset_password(params.dig(:user, :password), params.dig(:user, :password_confirmation))
      redirect_to new_user_session_path, notice: I18n.t("devise.passwords.updated")
    else
      render inertia: "auth/ResetPassword", props: {
        translations: I18n.t("auth.passwords.reset"),
        token_state: "valid",
        reset_password_token: token,
        errors: user.errors.messages
      }
    end
  end

  protected

  def after_resetting_password_path_for(_resource)
    new_user_session_path
  end
end
