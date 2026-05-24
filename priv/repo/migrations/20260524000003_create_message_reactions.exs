defmodule Voxr.Repo.Migrations.CreateMessageReactions do
  use Ecto.Migration

  def change do
    create table(:message_reactions) do
      add :emoji, :string, null: false
      add :message_id, references(:messages, on_delete: :delete_all), null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false
      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:message_reactions, [:message_id, :user_id, :emoji])
    create index(:message_reactions, [:message_id])
  end
end
