defmodule Voxr.Chat do
  import Ecto.Query
  alias Voxr.Repo
  alias Voxr.Chat.{Channel, Message}

  def list_channels do
    Channel
    |> where(type: "text")
    |> order_by(:name)
    |> Repo.all()
  end

  def get_channel!(id), do: Repo.get!(Channel, id)

  def create_channel(attrs) do
    %Channel{}
    |> Channel.changeset(attrs)
    |> Repo.insert()
  end

  def list_messages(channel_id, limit \\ 50) do
    Message
    |> where(channel_id: ^channel_id)
    |> order_by(asc: :inserted_at)
    |> limit(^limit)
    |> preload(:user)
    |> Repo.all()
  end

  def create_message(attrs) do
    result =
      %Message{}
      |> Message.changeset(attrs)
      |> Repo.insert()

    case result do
      {:ok, message} ->
        message = Repo.preload(message, :user)
        Phoenix.PubSub.broadcast(Voxr.PubSub, "room:#{message.channel_id}", {:new_message, message})
        {:ok, message}

      error ->
        error
    end
  end
end
