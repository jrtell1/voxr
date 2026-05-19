defmodule Voxr.Repo.Migrations.CreateChannelReads do
  use Ecto.Migration

  def change do
    create table(:channel_reads, primary_key: false) do
      add :user_id, references(:users, on_delete: :delete_all), null: false, primary_key: true
      add :channel_id, references(:channels, on_delete: :delete_all), null: false, primary_key: true
      add :last_read_id, :bigint, null: false, default: 0

      timestamps(type: :utc_datetime, inserted_at: false)
    end
  end
end
