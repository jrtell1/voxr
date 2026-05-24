defmodule Voxr.Chat.MessageAttachment do
  use Ecto.Schema
  import Ecto.Changeset

  schema "message_attachments" do
    field :url, :string
    field :filename, :string
    field :content_type, :string

    belongs_to :message, Voxr.Chat.Message

    timestamps(type: :utc_datetime, updated_at: false)
  end

  def changeset(attachment, attrs) do
    attachment
    |> cast(attrs, [:url, :filename, :content_type, :message_id])
    |> validate_required([:url, :filename, :content_type, :message_id])
  end
end
