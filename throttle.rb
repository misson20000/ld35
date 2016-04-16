require 'eventmachine'

module ThrottleServer
  module ThrottleClient
  end
  
  def post_init
    @buffer = ""
    @fwd = EventMachine.connect "127.0.0.1", "8000", ThrottleClient
    buffer = @buffer
    @fwd.define_singleton_method(:receive_data) do |data|
      buffer+= data
    end

    EventMachine.add_periodic_timer(1) do
      if buffer.length > 0 then
        if buffer.length > 1024*1024 then
          send_data buffer[0, 1024*1024]
          buffer = buffer[1024*1024, buffer.length-1024*1024]
        else
          send_data buffer
          buffer = ""
        end
      end
    end
  end
  def receive_data data
    @fwd.send_data data
  end
end

EventMachine.run do
  EventMachine.start_server "127.0.0.1", 8001, ThrottleServer
end
