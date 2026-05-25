defmodule Voxr.Chat.Channel do
  use Ecto.Schema
  import Ecto.Changeset

  schema "channels" do
    field :name, :string
    field :type, :string, default: "text"
    field :is_archived, :boolean, default: false

    has_many :messages, Voxr.Chat.Message
    has_many :channel_members, Voxr.Chat.ChannelMember

    timestamps(type: :utc_datetime)
  end

  def changeset(channel, attrs) do
    channel
    |> cast(attrs, [:name, :type])
    |> validate_required([:name, :type])
    |> validate_length(:name, min: 1, max: 100)
    |> validate_inclusion(:type, ["text", "voice"])
  end
end
