defmodule VoxrWeb.ChannelController do
  use VoxrWeb, :controller

  alias Voxr.Chat

  def index(conn, _params) do
    channels =
      (Chat.list_channels() ++ Chat.list_voice_channels())
      |> Enum.map(&%{id: &1.id, name: &1.name, type: &1.type})

    json(conn, channels)
  end
end
