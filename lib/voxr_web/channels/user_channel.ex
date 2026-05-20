defmodule VoxrWeb.UserChannel do
  use Phoenix.Channel

  alias Voxr.{Accounts, Chat}

  @impl true
  def join("user:me", _params, socket) do
    user = socket.assigns.current_user
    Phoenix.PubSub.subscribe(Voxr.PubSub, "user:#{user.id}")

    Chat.init_channel_reads(user.id)
    unread = Chat.all_unread_counts(user.id)

    {:ok, %{unread_counts: unread, display_name: user.display_name}, socket}
  end

  @impl true
  def handle_in("update_display_name", %{"display_name" => name}, socket) do
    case Accounts.update_display_name(socket.assigns.current_user.id, name) do
      {:ok, _user} -> {:reply, :ok, socket}
      {:error, _} -> {:reply, {:error, %{reason: "invalid"}}, socket}
    end
  end

  @impl true
  def handle_info({:unread_updated, channel_id, count}, socket) do
    push(socket, "unread_updated", %{channel_id: channel_id, count: count})
    {:noreply, socket}
  end
end
