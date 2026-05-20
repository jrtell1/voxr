defmodule Voxr.Chat do
  import Ecto.Query
  alias Voxr.Repo
  alias Voxr.Chat.{Channel, Message, ChannelRead, ChannelMember}

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
        broadcast_unread_updates(message)
        {:ok, message}

      error ->
        error
    end
  end

  def mark_read(user_id, channel_id) do
    last_id =
      Message
      |> where(channel_id: ^channel_id)
      |> select([m], max(m.id))
      |> Repo.one() || 0

    Repo.insert!(
      %ChannelRead{user_id: user_id, channel_id: channel_id, last_read_id: last_id},
      on_conflict: [set: [last_read_id: last_id, updated_at: DateTime.utc_now(:second)]],
      conflict_target: [:user_id, :channel_id]
    )

    last_id
  end

  def unread_count(user_id, channel_id) do
    last_read_id =
      ChannelRead
      |> where(user_id: ^user_id, channel_id: ^channel_id)
      |> select([r], r.last_read_id)
      |> Repo.one() || 0

    Message
    |> where(channel_id: ^channel_id)
    |> where([m], m.id > ^last_read_id)
    |> Repo.aggregate(:count)
  end

  def init_channel_reads(user_id) do
    channels = list_channels()

    existing =
      ChannelRead
      |> where(user_id: ^user_id)
      |> select([r], r.channel_id)
      |> Repo.all()
      |> MapSet.new()

    now = DateTime.utc_now(:second)

    rows =
      for channel <- channels, channel.id not in existing do
        last_id =
          Message
          |> where(channel_id: ^channel.id)
          |> select([m], max(m.id))
          |> Repo.one() || 0

        %{user_id: user_id, channel_id: channel.id, last_read_id: last_id, updated_at: now}
      end

    Repo.insert_all(ChannelRead, rows, on_conflict: :nothing)
  end

  def all_unread_counts(user_id) do
    ChannelRead
    |> where(user_id: ^user_id)
    |> Repo.all()
    |> Map.new(fn read ->
      count =
        Message
        |> where(channel_id: ^read.channel_id)
        |> where([m], m.id > ^read.last_read_id)
        |> Repo.aggregate(:count)

      {read.channel_id, count}
    end)
  end

  # DMs

  def find_or_create_dm_channel(user_a_id, user_b_id) do
    case find_existing_dm_channel(user_a_id, user_b_id) do
      nil ->
        Repo.transaction(fn ->
          channel = Repo.insert!(%Channel{name: "dm", type: "dm"})
          now = DateTime.utc_now(:second)

          Repo.insert_all(ChannelMember, [
            %{channel_id: channel.id, user_id: user_a_id},
            %{channel_id: channel.id, user_id: user_b_id}
          ])

          Repo.insert_all(ChannelRead, [
            %{user_id: user_a_id, channel_id: channel.id, last_read_id: 0, updated_at: now},
            %{user_id: user_b_id, channel_id: channel.id, last_read_id: 0, updated_at: now}
          ], on_conflict: :nothing)

          channel
        end)

      channel ->
        {:ok, channel}
    end
  end

  def list_dm_channels(user_id) do
    Channel
    |> join(:inner, [c], m in ChannelMember, on: m.channel_id == c.id and m.user_id == ^user_id)
    |> where([c], c.type == "dm")
    |> preload(channel_members: :user)
    |> Repo.all()
  end

  def channel_member?(channel_id, user_id) do
    ChannelMember
    |> where(channel_id: ^channel_id, user_id: ^user_id)
    |> Repo.exists?()
  end

  defp find_existing_dm_channel(user_a_id, user_b_id) do
    Channel
    |> join(:inner, [c], m1 in ChannelMember,
      on: m1.channel_id == c.id and m1.user_id == ^user_a_id
    )
    |> join(:inner, [c, m1], m2 in ChannelMember,
      on: m2.channel_id == c.id and m2.user_id == ^user_b_id
    )
    |> where([c], c.type == "dm")
    |> limit(1)
    |> Repo.one()
  end

  defp broadcast_unread_updates(message) do
    readers =
      ChannelRead
      |> where(channel_id: ^message.channel_id)
      |> where([r], r.user_id != ^message.user_id)
      |> Repo.all()

    for read <- readers do
      count = unread_count(read.user_id, message.channel_id)

      Phoenix.PubSub.broadcast(
        Voxr.PubSub,
        "user:#{read.user_id}",
        {:unread_updated, message.channel_id, count}
      )
    end
  end
end
