defmodule VoxrWeb.AuthController do
  use VoxrWeb, :controller

  def login(conn, %{"username" => username, "password" => password}) do
    case Voxr.Accounts.authenticate_user(username, password) do
      {:ok, user} ->
        json(conn, %{token: sign_token(user)})

      {:error, :not_found} ->
        conn |> put_status(:unauthorized) |> json(%{error: "No account with that username"})

      {:error, :invalid_credentials} ->
        conn |> put_status(:unauthorized) |> json(%{error: "Incorrect password"})
    end
  end

  def login(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "Missing username or password"})
  end

  def register(conn, %{"username" => username, "password" => password}) do
    case Voxr.Accounts.register_user(username, password) do
      {:ok, user} ->
        conn |> put_status(:created) |> json(%{token: sign_token(user)})

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

        conn |> put_status(:unprocessable_entity) |> json(%{error: message})
    end
  end

  def register(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "Missing username or password"})
  end

  defp sign_token(user), do: Phoenix.Token.sign(VoxrWeb.Endpoint, "user auth", user.id)
end
