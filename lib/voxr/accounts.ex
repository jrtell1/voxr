defmodule Voxr.Accounts do
  alias Voxr.Repo
  alias Voxr.Accounts.User

  def get_user(id), do: Repo.get(User, id)

  def get_user_by_username(username) do
    Repo.get_by(User, username: username)
  end

  def find_or_create_user(username) do
    case get_user_by_username(username) do
      nil -> create_user(%{username: username})
      user -> {:ok, user}
    end
  end

  def create_user(attrs) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  def list_users do
    Repo.all(User)
  end
end
