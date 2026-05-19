defmodule Voxr.Chat.ChannelRead do
  use Ecto.Schema

  @primary_key false
  schema "channel_reads" do
    belongs_to :user, Voxr.Accounts.User, primary_key: true
    belongs_to :channel, Voxr.Chat.Channel, primary_key: true
    field :last_read_id, :integer, default: 0

    timestamps(type: :utc_datetime, inserted_at: false)
  end
end
