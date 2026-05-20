defmodule VoxrWeb.UserSocket do
  use Phoenix.Socket

  channel "room:*", VoxrWeb.RoomChannel
  channel "user:me", VoxrWeb.UserChannel

  @impl true
  def connect(%{"token" => token}, socket, _connect_info) do
    case Phoenix.Token.verify(VoxrWeb.Endpoint, "user auth", token, max_age: 604_800) do
      {:ok, user_id} ->
        case Voxr.Accounts.get_user(user_id) do
          nil -> :error
          user -> {:ok, assign(socket, :current_user, user)}
        end

      {:error, _} ->
        :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.current_user.id}"
end
