defmodule Voxr.Repo.Migrations.AddMessageReadIndexes do
  use Ecto.Migration

  def change do
    # Accelerates max(id)/count(id > X)/list_messages, all of which filter by
    # channel_id and order/range on id. Lets these run index-only.
    create index(:messages, [:channel_id, :id])

    # broadcast_unread_updates queries channel_reads by channel_id alone, but
    # the table's primary key is (user_id, channel_id), so channel_id is not a
    # usable prefix. This index covers that lookup.
    create index(:channel_reads, [:channel_id])
  end
end
