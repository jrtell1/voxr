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
    Phoenix.PubSub.subscribe(Voxr.PubSub, "user:#{user.id}")

    {:ok, _} =
      Presence.track(socket, user.id, %{
        username: user.username,
        display_name: user.display_name,
        voice_channel_id: nil
      })

    push(socket, "presence_state", Presence.list(socket))
    {:noreply, socket}
  end

  @impl true
  def handle_info({:presence_update, display_name}, socket) do
    user = socket.assigns.current_user
    Presence.update(socket, user.id, fn meta ->
      Map.put(meta, :display_name, display_name)
    end)
    {:noreply, socket}
  end

  @impl true
  def handle_in("join_voice", %{"channel_id" => channel_id}, socket) do
    user = socket.assigns.current_user
    channel_id = if is_binary(channel_id), do: String.to_integer(channel_id), else: channel_id
    channel = Voxr.Chat.get_channel!(channel_id)

    if channel.type != "voice" do
      {:reply, {:error, %{reason: "not a voice channel"}}, socket}
    else
      Presence.update(socket, user.id, fn meta ->
        Map.put(meta, :voice_channel_id, channel_id)
      end)

      display_name = user.display_name || user.username
      room_name = "voice:#{channel_id}"

      case Voxr.LiveKit.generate_token(user.id, display_name, room_name) do
        {:ok, token} ->
          livekit_url = Application.get_env(:voxr, :livekit_url)
          {:reply, {:ok, %{token: token, url: livekit_url}}, socket}

        {:error, _} ->
          {:reply, {:error, %{reason: "token generation failed"}}, socket}
      end
    end
  end

  @impl true
  def handle_in("leave_voice", _params, socket) do
    user = socket.assigns.current_user
    Presence.update(socket, user.id, fn meta ->
      Map.put(meta, :voice_channel_id, nil)
    end)
    {:reply, :ok, socket}
  end

  @impl true
  def handle_out("presence_diff", payload, socket) do
    push(socket, "presence_diff", payload)
    {:noreply, socket}
  end
end
