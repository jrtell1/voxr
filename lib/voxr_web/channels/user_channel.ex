defmodule VoxrWeb.UserChannel do
  use Phoenix.Channel

  alias Voxr.Chat

  @impl true
  def join("user:me", _params, socket) do
    user_id = socket.assigns.current_user.id
    Phoenix.PubSub.subscribe(Voxr.PubSub, "user:#{user_id}")

    Chat.init_channel_reads(user_id)
    unread = Chat.all_unread_counts(user_id)

    {:ok, %{unread_counts: unread}, socket}
  end

  @impl true
  def handle_info({:unread_updated, channel_id, count}, socket) do
    push(socket, "unread_updated", %{channel_id: channel_id, count: count})
    {:noreply, socket}
  end
end
