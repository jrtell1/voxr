defmodule Voxr.Repo.Migrations.CreateChannelMembers do
  use Ecto.Migration

  def change do
    create table(:channel_members) do
      add :channel_id, references(:channels, on_delete: :delete_all), null: false
      add :user_id, references(:users, on_delete: :delete_all), null: false
    end

    create unique_index(:channel_members, [:channel_id, :user_id])
    create index(:channel_members, [:user_id])
  end
end
