alias Voxr.{Chat, Repo}

if Repo.all(Voxr.Chat.Channel) == [] do
  for name <- ["general", "off-topic", "dev"] do
    Chat.create_channel(%{name: name, type: "text"})
  end

  Chat.create_channel(%{name: "voice-general", type: "voice"})

  IO.puts("Seeded default channels")
else
  IO.puts("Already seeded, skipping")
end
