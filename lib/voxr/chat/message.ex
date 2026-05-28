defmodule Voxr.Chat.Message do
  use Ecto.Schema
  import Ecto.Changeset

  schema "messages" do
    field :content, :string, default: ""
    field :is_edited, :boolean, default: false

    belongs_to :user, Voxr.Accounts.User
    belongs_to :channel, Voxr.Chat.Channel
    has_many :attachments, Voxr.Chat.MessageAttachment
    has_many :reactions, Voxr.Chat.MessageReaction

    timestamps(type: :utc_datetime)
  end

  def changeset(message, attrs) do
    message
    |> cast(attrs, [:content, :user_id, :channel_id])
    |> validate_required([:user_id, :channel_id])
    |> validate_length(:content, max: 4000)
  end

  def edit_changeset(message, attrs) do
    message
    |> cast(attrs, [:content])
    |> validate_required([:content])
    |> validate_length(:content, min: 1, max: 4000)
    |> put_change(:is_edited, true)
  end
end
