defmodule VoxrWeb.RoomChannel do
  use Phoenix.Channel

  alias Voxr.Chat

  @impl true
  def join("room:" <> channel_id, _params, socket) do
    channel_id = String.to_integer(channel_id)
    channel = Chat.get_channel!(channel_id)
    messages = Chat.list_messages(channel_id)

    send(self(), :after_join)

    {:ok, %{channel: serialize_channel(channel), messages: Enum.map(messages, &serialize_message/1)},
     assign(socket, :channel_id, channel_id)}
  end

  @impl true
  def handle_info(:after_join, socket) do
    Phoenix.PubSub.subscribe(Voxr.PubSub, "room:#{socket.assigns.channel_id}")
    {:noreply, socket}
  end

  def handle_info({:new_message, message}, socket) do
    push(socket, "new_message", serialize_message(message))
    {:noreply, socket}
  end

  @impl true
  def handle_in("send_message", %{"content" => content}, socket) do
    user = socket.assigns.current_user
    channel_id = socket.assigns.channel_id

    case Chat.create_message(%{content: content, user_id: user.id, channel_id: channel_id}) do
      {:ok, _message} -> {:reply, :ok, socket}
      {:error, _changeset} -> {:reply, {:error, %{reason: "invalid message"}}, socket}
    end
  end

  defp serialize_channel(channel) do
    %{id: channel.id, name: channel.name, type: channel.type}
  end

  defp serialize_message(message) do
    %{
      id: message.id,
      content: message.content,
      inserted_at: DateTime.to_iso8601(message.inserted_at),
      user: %{id: message.user.id, username: message.user.username, display_name: message.user.display_name}
    }
  end
end
