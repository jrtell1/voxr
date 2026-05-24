defmodule Voxr.Chat.MessageReaction do
  use Ecto.Schema
  import Ecto.Changeset

  schema "message_reactions" do
    field :emoji, :string
    belongs_to :message, Voxr.Chat.Message
    belongs_to :user, Voxr.Accounts.User
    timestamps(type: :utc_datetime, updated_at: false)
  end

  def changeset(reaction, attrs) do
    reaction
    |> cast(attrs, [:emoji, :message_id, :user_id])
    |> validate_required([:emoji, :message_id, :user_id])
    |> unique_constraint([:message_id, :user_id, :emoji])
  end
end
