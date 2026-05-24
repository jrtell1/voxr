defmodule Voxr.Chat.Message do
  use Ecto.Schema
  import Ecto.Changeset

  schema "messages" do
    field :content, :string, default: ""

    belongs_to :user, Voxr.Accounts.User
    belongs_to :channel, Voxr.Chat.Channel
    has_many :attachments, Voxr.Chat.MessageAttachment
    has_many :reactions, Voxr.Chat.MessageReaction

    timestamps(type: :utc_datetime, updated_at: false)
  end

  def changeset(message, attrs) do
    message
    |> cast(attrs, [:content, :user_id, :channel_id])
    |> validate_required([:user_id, :channel_id])
    |> validate_length(:content, max: 4000)
  end
end
