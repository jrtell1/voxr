defmodule VoxrWeb.UserChannel do
  use Phoenix.Channel

  alias Voxr.{Accounts, Chat}

  @impl true
  def join("user:me", _params, socket) do
    user = socket.assigns.current_user
    Phoenix.PubSub.subscribe(Voxr.PubSub, "user:#{user.id}")

    Chat.init_channel_reads(user.id)
    unread = Chat.all_unread_counts(user.id)
    dm_channels = Chat.list_dm_channels(user.id)

    {:ok,
     %{
       unread_counts: unread,
       display_name: user.display_name,
       dm_channels: Enum.map(dm_channels, &serialize_dm_channel(&1, user.id))
     }, socket}
  end

  @impl true
  def handle_in("update_display_name", %{"display_name" => name}, socket) do
    case Accounts.update_display_name(socket.assigns.current_user.id, name) do
      {:ok, _user} -> {:reply, :ok, socket}
      {:error, _} -> {:reply, {:error, %{reason: "invalid"}}, socket}
    end
  end

  @impl true
  def handle_in("open_dm", %{"user_id" => target_id}, socket) do
    user = socket.assigns.current_user

    case Chat.find_or_create_dm_channel(user.id, target_id) do
      {:ok, channel} ->
        other_user = Accounts.get_user(target_id)

        {:reply,
         {:ok,
          %{
            channel_id: channel.id,
            other_user: %{
              id: other_user.id,
              username: other_user.username,
              display_name: other_user.display_name
            }
          }}, socket}

      {:error, _} ->
        {:reply, {:error, %{reason: "failed"}}, socket}
    end
  end

  @impl true
  def handle_in("poke", %{"user_id" => target_id}, socket) do
    poker = socket.assigns.current_user

    Phoenix.PubSub.broadcast(Voxr.PubSub, "user:#{target_id}", {:poke, %{
      from_id: poker.id,
      from_username: poker.username,
      from_display_name: poker.display_name
    }})

    {:reply, :ok, socket}
  end

  @impl true
  def handle_info({:unread_updated, channel_id, count}, socket) do
    push(socket, "unread_updated", %{channel_id: channel_id, count: count})
    {:noreply, socket}
  end

  @impl true
  def handle_info({:poke, data}, socket) do
    push(socket, "poke", data)
    {:noreply, socket}
  end

  defp serialize_dm_channel(channel, current_user_id) do
    other_user =
      channel.channel_members
      |> Enum.map(& &1.user)
      |> Enum.find(fn u -> u.id != current_user_id end)

    %{
      id: channel.id,
      other_user: %{
        id: other_user.id,
        username: other_user.username,
        display_name: other_user.display_name
      }
    }
  end
end
