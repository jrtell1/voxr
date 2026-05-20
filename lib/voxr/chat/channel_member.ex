defmodule Voxr.Chat.ChannelMember do
  use Ecto.Schema

  schema "channel_members" do
    belongs_to :channel, Voxr.Chat.Channel
    belongs_to :user, Voxr.Accounts.User
  end
end
