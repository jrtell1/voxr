defmodule VoxrWeb.UploadController do
  use VoxrWeb, :controller

  @max_size 10 * 1024 * 1024
  @allowed_types ~w(image/jpeg image/png image/gif image/webp)

  def create(conn, %{"file" => %Plug.Upload{} = upload}) do
    with {:ok, _user} <- authenticate(conn),
         :ok <- validate_upload(upload) do
      ext = Path.extname(upload.filename)
      stored_name = Ecto.UUID.generate() <> ext
      dest = Path.join(uploads_dir(), stored_name)

      File.mkdir_p!(uploads_dir())
      File.cp!(upload.path, dest)

      json(conn, %{
        url: "/uploads/#{stored_name}",
        filename: upload.filename,
        content_type: upload.content_type
      })
    else
      {:error, :unauthorized} ->
        conn |> put_status(:unauthorized) |> json(%{error: "Unauthorized"})

      {:error, :invalid_type} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "File type not allowed"})

      {:error, :too_large} ->
        conn |> put_status(:unprocessable_entity) |> json(%{error: "File exceeds 10 MB limit"})
    end
  end

  def create(conn, _params) do
    conn |> put_status(:bad_request) |> json(%{error: "No file provided"})
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

  defp uploads_dir, do: Voxr.Storage.dir("uploads")
end
