defmodule Voxr.Repo.Migrations.CreateCustomEmojis do
  use Ecto.Migration

  def change do
    create table(:custom_emojis) do
      add :shortcode, :string, null: false
      add :url, :string, null: false
      add :content_type, :string, null: false
      add :uploader_id, references(:users, on_delete: :nilify_all)
      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:custom_emojis, [:shortcode])
  end
end
