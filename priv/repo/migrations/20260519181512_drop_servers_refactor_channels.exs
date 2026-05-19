defmodule Voxr.Repo.Migrations.DropServersRefactorChannels do
  use Ecto.Migration

  def up do
    alter table(:channels) do
      remove :server_id
    end

    drop table(:servers)
  end

  def down do
    create table(:servers) do
      add :name, :string, null: false
      add :owner_id, references(:users, on_delete: :restrict), null: false
      timestamps(type: :utc_datetime)
    end

    alter table(:channels) do
      add :server_id, references(:servers, on_delete: :delete_all), null: true
    end
  end
end
