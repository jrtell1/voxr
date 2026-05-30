defmodule Voxr.Chat do
  import Ecto.Query
  alias Voxr.Repo
  alias Voxr.Chat.{Channel, Message, MessageAttachment, MessageReaction, ChannelRead, ChannelMember, CustomEmoji}

  def list_channels do
    Channel
    |> where(type: "text", is_archived: false)
    |> order_by(:name)
    |> Repo.all()
  end

  def list_voice_channels do
    Channel
    |> where(type: "voice", is_archived: false)
    |> order_by(:name)
    |> Repo.all()
  end

  def get_channel!(id), do: Repo.get!(Channel, id)

  def create_channel(attrs) do
    %Channel{}
    |> Channel.changeset(attrs)
    |> Repo.insert()
  end

  def update_message(message_id, user_id, new_content) do
    with message when not is_nil(message) <- Repo.get(Message, message_id),
         :ok <- if(message.user_id == user_id, do: :ok, else: {:error, :forbidden}),
         false <- String.trim(new_content) == "" do
      case message |> Message.edit_changeset(%{content: new_content}) |> Repo.update() do
        {:ok, updated} ->
          updated = Repo.preload(updated, [:user, :attachments, :reactions])
          Phoenix.PubSub.broadcast(Voxr.PubSub, "room:#{updated.channel_id}", {:message_edited, updated})
          {:ok, updated}
        error -> error
      end
    else
      nil -> {:error, :not_found}
      {:error, reason} -> {:error, reason}
      true -> {:error, :empty_content}
    end
  end

  def archive_channel(channel_id) do
    case Repo.get(Channel, channel_id) do
      nil -> {:error, :not_found}
      channel ->
        channel
        |> Ecto.Changeset.change(is_archived: true)
        |> Repo.update()
    end
  end

  def list_messages(channel_id, limit \\ 50, before_id \\ nil) do
    query =
      Message
      |> where(channel_id: ^channel_id)
      |> order_by(desc: :id)
      |> limit(^(limit + 1))
      |> preload([:user, :attachments, :reactions])

    query = if before_id, do: where(query, [m], m.id < ^before_id), else: query

    results = Repo.all(query)
    has_more = length(results) > limit
    messages = results |> Enum.take(limit) |> Enum.reverse()
    {messages, has_more}
  end

  def create_message(attrs) do
    attachments = Map.get(attrs, :attachments, [])
    content = Map.get(attrs, :content, "")

    if content == "" and attachments == [] do
      {:error, :empty_message}
    else
      result =
        %Message{}
        |> Message.changeset(attrs)
        |> Repo.insert()

      case result do
        {:ok, message} ->
          if attachments != [] do
            now = DateTime.utc_now(:second)
            rows = Enum.map(attachments, fn a ->
              %{message_id: message.id, url: a.url, filename: a.filename, content_type: a.content_type, inserted_at: now}
            end)
            Repo.insert_all(MessageAttachment, rows)
          end

          message = Repo.preload(message, [:user, :attachments, :reactions])
          Phoenix.PubSub.broadcast(Voxr.PubSub, "room:#{message.channel_id}", {:new_message, message})
          broadcast_unread_updates(message)
          {:ok, message}

        error ->
          error
      end
    end
  end

  def mark_read(user_id, channel_id) do
    last_id =
      Message
      |> where(channel_id: ^channel_id)
      |> select([m], max(m.id))
      |> Repo.one() || 0

    mark_read(user_id, channel_id, last_id)
  end

  # Variant for callers that already know the latest message id (e.g. the
  # live new_message handler), skipping the SELECT max(id) round-trip.
  def mark_read(user_id, channel_id, last_id) do
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

  # Reactions

  def toggle_reaction(user_id, message_id, emoji) do
    case Repo.get_by(MessageReaction, user_id: user_id, message_id: message_id, emoji: emoji) do
      nil ->
        %MessageReaction{}
        |> MessageReaction.changeset(%{user_id: user_id, message_id: message_id, emoji: emoji})
        |> Repo.insert!()

      existing ->
        Repo.delete!(existing)
    end

    reactions_for_message(message_id)
  end

  def reactions_for_message(message_id) do
    MessageReaction
    |> where(message_id: ^message_id)
    |> Repo.all()
    |> Enum.group_by(& &1.emoji)
    |> Enum.map(fn {emoji, rs} ->
      %{emoji: emoji, count: length(rs), user_ids: Enum.map(rs, & &1.user_id)}
    end)
  end

  # Custom emojis

  def list_custom_emojis do
    Repo.all(CustomEmoji)
  end

  def create_custom_emoji(attrs) do
    %CustomEmoji{}
    |> CustomEmoji.changeset(attrs)
    |> Repo.insert()
  end

  def delete_custom_emoji(id) do
    case Repo.get(CustomEmoji, id) do
      nil ->
        {:error, :not_found}

      emoji ->
        file_path = Path.join(:code.priv_dir(:voxr), "static#{emoji.url}")
        File.rm(file_path)
        Repo.delete(emoji)
    end
  end

  defp broadcast_unread_updates(message) do
    # Single grouped query computes every reader's unread count at once,
    # instead of two queries per reader. count(m.id) is 0 when the left join
    # finds no newer messages.
    counts =
      from(r in ChannelRead,
        left_join: m in Message,
        on: m.channel_id == r.channel_id and m.id > r.last_read_id,
        where: r.channel_id == ^message.channel_id and r.user_id != ^message.user_id,
        group_by: r.user_id,
        select: {r.user_id, count(m.id)}
      )
      |> Repo.all()

    for {user_id, count} <- counts do
      Phoenix.PubSub.broadcast(
        Voxr.PubSub,
        "user:#{user_id}",
        {:unread_updated, message.channel_id, count}
      )
    end
  end
end
