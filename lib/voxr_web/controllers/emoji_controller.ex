defmodule VoxrWeb.EmojiController do
  use VoxrWeb, :controller
  alias Voxr.Chat

  @max_size 2 * 1024 * 1024
  @allowed_types ~w(image/jpeg image/png image/gif image/webp)

  def index(conn, _params) do
    with {:ok, _user} <- authenticate(conn) do
      emojis = Chat.list_custom_emojis()
      json(conn, Enum.map(emojis, &serialize/1))
    else
      {:error, :unauthorized} ->
        conn |> put_status(:unauthorized) |> json(%{error: "Unauthorized"})
    end
  end

  def create(conn, %{"file" => %Plug.Upload{} = upload, "shortcode" => shortcode}) do
    with {:ok, user} <- authenticate(conn),
         :ok <- validate_upload(upload) do
      ext = Path.extname(upload.filename)
      stored_name = Ecto.UUID.generate() <> ext
      dest = Path.join(emojis_dir(), stored_name)
      File.mkdir_p!(emojis_dir())
      File.cp!(upload.path, dest)

      case Chat.create_custom_emoji(%{
             shortcode: shortcode,
             url: "/emojis/#{stored_name}",
             content_type: upload.content_type,
             uploader_id: user.id
           }) do
        {:ok, emoji} ->
          json(conn, serialize(emoji))

        {:error, changeset} ->
          File.rm(dest)

          conn
          |> put_status(:unprocessable_entity)
          |> json(%{error: format_errors(changeset)})
      end
    else
      {:error, :unauthorized} ->
        conn |> put_status(:unauthorized) |> json(%{error: "Unauthorized"})

      {:error, :invalid_type} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "File type not allowed"})

      {:error, :too_large} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "File exceeds 2 MB limit"})
    end
  end

  def create(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "Missing file or shortcode"})
  end

  def delete(conn, %{"id" => id}) do
    with {:ok, _user} <- authenticate(conn) do
      case Integer.parse(id) do
        {int_id, _} ->
          case Chat.delete_custom_emoji(int_id) do
            {:ok, _} -> json(conn, %{ok: true})
            {:error, :not_found} -> conn |> put_status(:not_found) |> json(%{error: "Not found"})
            {:error, _} -> conn |> put_status(:internal_server_error) |> json(%{error: "Delete failed"})
          end

        :error ->
          conn |> put_status(:bad_request) |> json(%{error: "Invalid id"})
      end
    else
      {:error, :unauthorized} ->
        conn |> put_status(:unauthorized) |> json(%{error: "Unauthorized"})
    end
  end

  defp authenticate(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] ->
        case Phoenix.Token.verify(VoxrWeb.Endpoint, "user auth", token, max_age: 604_800) do
          {:ok, user_id} ->
            case Voxr.Accounts.get_user(user_id) do
              nil -> {:error, :unauthorized}
              user -> {:ok, user}
            end

          {:error, _} ->
            {:error, :unauthorized}
        end

      _ ->
        {:error, :unauthorized}
    end
  end

  defp validate_upload(%Plug.Upload{content_type: ct, path: path}) do
    cond do
      ct not in @allowed_types -> {:error, :invalid_type}
      File.stat!(path).size > @max_size -> {:error, :too_large}
      true -> :ok
    end
  end

  defp serialize(emoji) do
    %{id: emoji.id, shortcode: emoji.shortcode, url: emoji.url, content_type: emoji.content_type}
  end

  defp format_errors(%{errors: errors}) do
    errors
    |> Enum.map(fn {field, {msg, _opts}} -> "#{field}: #{msg}" end)
    |> Enum.join("; ")
  end

  defp emojis_dir, do: Path.join(:code.priv_dir(:voxr), "static/emojis")
end
