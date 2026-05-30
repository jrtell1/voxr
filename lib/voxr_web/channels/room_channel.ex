defmodule VoxrWeb.RoomChannel do
  use Phoenix.Channel

  alias Voxr.{Accounts, Chat}

  intercept ["typing"]

  @impl true
  def join("room:" <> channel_id, _params, socket) do
    channel_id = String.to_integer(channel_id)
    channel = Chat.get_channel!(channel_id)
    user = socket.assigns.current_user

    if channel.type == "dm" and not Chat.channel_member?(channel_id, user.id) do
      {:error, %{reason: "unauthorized"}}
    else
      {messages, has_more} = Chat.list_messages(channel_id)
      Chat.mark_read(user.id, channel_id)
      Phoenix.PubSub.unsubscribe(Voxr.PubSub, "room:#{channel_id}")
      Phoenix.PubSub.subscribe(Voxr.PubSub, "room:#{channel_id}")
      users = Accounts.list_users()

      {:ok,
       %{
         channel: serialize_channel(channel),
         messages: Enum.map(messages, &serialize_message/1),
         has_more: has_more,
         users: Enum.map(users, &serialize_user/1)
       },
       assign(socket, :channel_id, channel_id)}
    end
  end

  @impl true
  def handle_in("load_more", %{"before_id" => before_id}, socket) do
    {messages, has_more} = Chat.list_messages(socket.assigns.channel_id, 50, before_id)
    {:reply, {:ok, %{messages: Enum.map(messages, &serialize_message/1), has_more: has_more}}, socket}
  end

  def handle_in("typing", _params, socket) do
    user = socket.assigns.current_user

    broadcast_from!(socket, "typing", %{
      user_id: user.id,
      name: user.display_name || user.username
    })

    {:noreply, socket}
  end

  def handle_in("react", %{"message_id" => message_id, "emoji" => emoji}, socket) do
    user = socket.assigns.current_user
    reactions = Chat.toggle_reaction(user.id, message_id, emoji)

    Phoenix.PubSub.broadcast(
      Voxr.PubSub,
      "room:#{socket.assigns.channel_id}",
      {:reaction_updated, message_id, reactions}
    )

    {:noreply, socket}
  end

  def handle_in("edit_message", %{"message_id" => message_id, "content" => content}, socket) do
    user = socket.assigns.current_user

    case Chat.update_message(message_id, user.id, content) do
      {:ok, _} -> {:reply, :ok, socket}
      {:error, :forbidden} -> {:reply, {:error, %{reason: "forbidden"}}, socket}
      {:error, :not_found} -> {:reply, {:error, %{reason: "not_found"}}, socket}
      {:error, :empty_content} -> {:reply, {:error, %{reason: "empty_content"}}, socket}
      {:error, _} -> {:reply, {:error, %{reason: "invalid"}}, socket}
    end
  end

  def handle_in("send_message", params, socket) do
    user = socket.assigns.current_user
    channel_id = socket.assigns.channel_id
    content = Map.get(params, "content", "")

    attachments =
      params
      |> Map.get("attachments", [])
      |> Enum.map(fn a -> %{url: a["url"], filename: a["filename"], content_type: a["content_type"]} end)

    case Chat.create_message(%{content: content, user_id: user.id, channel_id: channel_id, attachments: attachments}) do
      {:ok, message} ->
        notify_mentions(message, user)
        {:reply, :ok, socket}
      {:error, _} -> {:reply, {:error, %{reason: "invalid message"}}, socket}
    end
  end

  @impl true
  def handle_out("typing", msg, socket) do
    push(socket, "typing", msg)
    {:noreply, socket}
  end

  @impl true
  def handle_info({:reaction_updated, message_id, reactions}, socket) do
    push(socket, "reaction_updated", %{message_id: message_id, reactions: reactions})
    {:noreply, socket}
  end

  def handle_info({:message_edited, message}, socket) do
    push(socket, "message_edited", serialize_message(message))
    {:noreply, socket}
  end

  def handle_info({:new_message, message}, socket) do
    push(socket, "new_message", serialize_message(message))
    push(socket, "unread_updated", %{channel_id: socket.assigns.channel_id, count: 0})
    {:noreply, throttled_mark_read(socket, message.id)}
  end

  @impl true
  def terminate(_reason, socket) do
    # Flush the latest read position on leave/disconnect so throttling never
    # loses read state (join also re-marks, so this only matters mid-session).
    if last_id = socket.assigns[:pending_read_id] do
      Chat.mark_read(socket.assigns.current_user.id, socket.assigns.channel_id, last_id)
    end

    :ok
  end

  # Persist read state at most once every few seconds per viewer rather than on
  # every incoming message. The client UI is kept correct by the count:0 push
  # above; the DB row only needs to be roughly current for other sessions.
  @read_persist_interval_ms 3_000
  defp throttled_mark_read(socket, message_id) do
    now = System.monotonic_time(:millisecond)
    last_persist = socket.assigns[:last_read_persist] || 0

    if now - last_persist >= @read_persist_interval_ms do
      Chat.mark_read(socket.assigns.current_user.id, socket.assigns.channel_id, message_id)

      socket
      |> assign(:last_read_persist, now)
      |> assign(:pending_read_id, nil)
    else
      assign(socket, :pending_read_id, message_id)
    end
  end

  defp serialize_user(user) do
    %{id: user.id, username: user.username, display_name: user.display_name}
  end

  defp serialize_channel(channel) do
    %{id: channel.id, name: channel.name, type: channel.type}
  end

  defp serialize_message(message) do
    %{
      id: message.id,
      content: message.content,
      is_edited: message.is_edited,
      inserted_at: DateTime.to_iso8601(message.inserted_at),
      user: %{
        id: message.user.id,
        username: message.user.username,
        display_name: message.user.display_name
      },
      attachments: Enum.map(message.attachments, fn a ->
        %{url: a.url, filename: a.filename, content_type: a.content_type}
      end),
      reactions: serialize_reactions(message.reactions)
    }
  end

  defp notify_mentions(message, sender) do
    usernames =
      Regex.scan(~r/@([a-zA-Z0-9_]+)/, message.content, capture: :all_but_first)
      |> List.flatten()
      |> Enum.uniq()

    for username <- usernames do
      case Accounts.get_user_by_username(username) do
        nil -> :ok
        %{id: id} when id != sender.id ->
          Phoenix.PubSub.broadcast(Voxr.PubSub, "user:#{id}", {:mentioned, %{
            from_display_name: sender.display_name,
            from_username: sender.username,
            content: message.content
          }})
        _ -> :ok
      end
    end
  end

  defp serialize_reactions(reactions) do
    reactions
    |> Enum.group_by(& &1.emoji)
    |> Enum.map(fn {emoji, rs} ->
      %{emoji: emoji, count: length(rs), user_ids: Enum.map(rs, & &1.user_id)}
    end)
  end
end
