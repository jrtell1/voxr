defmodule Voxr.Accounts do
  alias Voxr.Repo
  alias Voxr.Accounts.User

  def get_user(id), do: Repo.get(User, id)

  def get_user_by_username(username) do
    Repo.get_by(User, username: username)
  end

  def find_or_create_user(username, password) do
    case get_user_by_username(username) do
      nil ->
        create_user(%{username: username, password: password})

      user ->
        if Pbkdf2.verify_pass(password, user.password_hash) do
          {:ok, user}
        else
          {:error, :invalid_credentials}
        end
    end
  end

  def create_user(attrs) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  def update_display_name(user_id, display_name) do
    case get_user(user_id) do
      nil -> {:error, :not_found}
      user ->
        user
        |> Ecto.Changeset.change(display_name: display_name)
        |> Ecto.Changeset.validate_length(:display_name, min: 1, max: 50)
        |> Repo.update()
    end
  end

  def list_users do
    Repo.all(User)
  end
end
