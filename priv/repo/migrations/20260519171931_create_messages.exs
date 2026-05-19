defmodule Voxr.Repo.Migrations.CreateMessages do
  use Ecto.Migration

  def change do
    create table(:messages) do
      add :content, :text, null: false
      add :user_id, references(:users, on_delete: :restrict), null: false
      add :channel_id, references(:channels, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:messages, [:channel_id])
    create index(:messages, [:user_id])
  end
end
