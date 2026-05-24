defmodule Voxr.Chat.CustomEmoji do
  use Ecto.Schema
  import Ecto.Changeset

  schema "custom_emojis" do
    field :shortcode, :string
    field :url, :string
    field :content_type, :string
    belongs_to :uploader, Voxr.Accounts.User
    timestamps(type: :utc_datetime, updated_at: false)
  end

  def changeset(emoji, attrs) do
    emoji
    |> cast(attrs, [:shortcode, :url, :content_type, :uploader_id])
    |> validate_required([:shortcode, :url, :content_type, :uploader_id])
    |> validate_format(:shortcode, ~r/^[a-z0-9_]+$/, message: "only lowercase letters, digits, and underscores")
    |> validate_length(:shortcode, min: 2, max: 32)
    |> unique_constraint(:shortcode)
  end
end
