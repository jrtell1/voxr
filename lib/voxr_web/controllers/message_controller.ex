defmodule VoxrWeb.MessageController do
  use VoxrWeb, :controller

  alias Voxr.Chat

  def index(conn, %{"id" => channel_id} = params) do
    limit = min(String.to_integer(params["limit"] || "50"), 100)
    messages = Chat.list_messages(String.to_integer(channel_id), limit)

    json(conn, Enum.map(messages, &serialize/1))
  end

  defp serialize(msg) do
    %{
      id: msg.id,
      content: msg.content,
      inserted_at: DateTime.to_iso8601(msg.inserted_at),
      user: %{id: msg.user.id, username: msg.user.username, display_name: msg.user.display_name}
    }
  end
end
