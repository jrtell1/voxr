defmodule VoxrWeb.ServerChannel do
  use Phoenix.Channel
  alias VoxrWeb.Presence

  intercept ["presence_diff"]

  @impl true
  def join("server:lobby", _params, socket) do
    send(self(), :after_join)
    {:ok, socket}
  end

  @impl true
  def handle_info(:after_join, socket) do
    user = socket.assigns.current_user

    {:ok, _} =
      Presence.track(socket, user.id, %{
        username: user.username,
        display_name: user.display_name
      })

    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end

  @impl true
  def handle_out("presence_diff", payload, socket) do
    push(socket, "presence_diff", payload)
    {:noreply, socket}
  end
end
