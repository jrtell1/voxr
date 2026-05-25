defmodule Voxr.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :username, :string
    field :display_name, :string
    field :is_admin, :boolean, default: false
    field :password_hash, :string
    field :password, :string, virtual: true

    has_many :messages, Voxr.Chat.Message

    timestamps(type: :utc_datetime)
  end

  def changeset(user, attrs) do
    user
    |> cast(attrs, [:username, :display_name, :password])
    |> validate_required([:username, :password])
    |> validate_length(:username, min: 2, max: 32)
    |> validate_format(:username, ~r/^[a-zA-Z0-9_]+$/)
    |> validate_length(:password, min: 6)
    |> unique_constraint(:username)
    |> put_display_name()
    |> hash_password()
  end

  defp put_display_name(%{changes: %{username: u}} = changeset) do
    if get_field(changeset, :display_name) do
      changeset
    else
      put_change(changeset, :display_name, u)
    end
  end

  defp put_display_name(changeset), do: changeset

  defp hash_password(%{valid?: true, changes: %{password: pw}} = changeset) do
    put_change(changeset, :password_hash, Pbkdf2.hash_pwd_salt(pw))
  end

  defp hash_password(changeset), do: changeset
end
