defmodule Voxr.Chat.Message do
  use Ecto.Schema
  import Ecto.Changeset

  schema "messages" do
    field :content, :string

    belongs_to :user, Voxr.Accounts.User
    belongs_to :channel, Voxr.Chat.Channel

    timestamps(type: :utc_datetime, updated_at: false)
  end

  def changeset(message, attrs) do
    message
    |> cast(attrs, [:content, :user_id, :channel_id])
    |> validate_required([:content, :user_id, :channel_id])
    |> validate_length(:content, min: 1, max: 4000)
  end
end
