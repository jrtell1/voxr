defmodule VoxrWeb.UserSocket do
  use Phoenix.Socket

  channel "room:*", VoxrWeb.RoomChannel
  channel "user:me", VoxrWeb.UserChannel

  @impl true
  def connect(%{"username" => username}, socket, _connect_info) do
    case Voxr.Accounts.find_or_create_user(username) do
      {:ok, user} -> {:ok, assign(socket, :current_user, user)}
      {:error, _} -> :error
    end
  end

  def connect(_params, _socket, _connect_info), do: :error

  @impl true
  def id(socket), do: "user_socket:#{socket.assigns.current_user.id}"
end
