defmodule VoxrWeb.AuthController do
  use VoxrWeb, :controller

  def login(conn, %{"username" => username, "password" => password}) do
    case Voxr.Accounts.find_or_create_user(username, password) do
      {:ok, user} ->
        token = Phoenix.Token.sign(VoxrWeb.Endpoint, "user auth", user.id)
        json(conn, %{token: token})

      {:error, :invalid_credentials} ->
        conn
        |> put_status(:unauthorized)
        |> json(%{error: "Incorrect password"})

      {:error, %Ecto.Changeset{} = changeset} ->
        message =
          changeset
          |> Ecto.Changeset.traverse_errors(fn {msg, opts} ->
            Enum.reduce(opts, msg, fn {key, val}, acc ->
              String.replace(acc, "%{#{key}}", to_string(val))
            end)
          end)
          |> Enum.map_join(", ", fn {field, errors} ->
            "#{field} #{Enum.join(errors, ", ")}"
          end)

        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: message})
    end
  end

  def login(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "Missing username or password"})
  end
end
