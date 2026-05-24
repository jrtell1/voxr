defmodule Voxr.Repo.Migrations.CreateMessageAttachments do
  use Ecto.Migration

  def change do
    create table(:message_attachments) do
      add :message_id, references(:messages, on_delete: :delete_all), null: false
      add :url, :string, null: false
      add :filename, :string, null: false
      add :content_type, :string, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:message_attachments, [:message_id])
  end
end
