defmodule Voxr.Repo.Migrations.CreateChannels do
  use Ecto.Migration

  def change do
    create table(:channels) do
      add :name, :string, null: false
      add :type, :string, null: false, default: "text"
      add :server_id, references(:servers, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:channels, [:server_id])
  end
end
