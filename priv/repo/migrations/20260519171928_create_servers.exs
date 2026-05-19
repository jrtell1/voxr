defmodule Voxr.Repo.Migrations.CreateServers do
  use Ecto.Migration

  def change do
    create table(:servers) do
      add :name, :string, null: false
      add :owner_id, references(:users, on_delete: :restrict), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:servers, [:owner_id])
  end
end
