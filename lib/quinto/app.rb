require 'roda'
require 'tilt/erubis'
require_relative 'game'
require_relative 'db'

require 'message_bus'
MessageBus.configure(:backend=>:memory)

module Quinto
  class App < Roda
    opts[:root] = File.expand_path('../../..', __FILE__)
    TEST_MODE = ENV['QUINTO_TEST'] == '1'

    secret = ENV['QUINTO_SESSION_SECRET'] || SecureRandom.random_bytes(30)
    use Rack::Session::Cookie, :secret=>secret, :key => '_quinto_session'

    plugin :public
    plugin :render, :escape=>true
    plugin :symbol_views
    plugin :symbol_matchers
    plugin :json
    plugin :param_matchers
    plugin :message_bus

    plugin :not_found do
      view(:content=>"<h1>Not Found</h1>")
    end

    plugin :error_handler do |e|
      puts e
      puts e.backtrace
      e.message
    end

    plugin :rodauth do
      enable :login, :logout, :create_account, :change_password, :change_login, :remember
      db DB
      prefix "auth"
      accounts_table :players
      account_password_hash_column :hash
      require_email_address_logins? false
      update_session do
        super()
        session[:email] = account[:email]
      end
      after_change_login{session[:email] = DB[:players].where(:id=>session_value).get(:email)}
      logout_redirect '/auth/login'

      after_login{remember_login}
      after_create_account{remember_login}
      remember_cookie_options :httponly=>true, :path=>'/'
      extend_remember_deadline? true
      remember_period :days=>365
    end

    route do |r|
      r.public
      rodauth.load_memory

      r.on "auth" do
        r.rodauth
      end

      if player_id = rodauth.session_value
        @player = Player.new(player_id, session[:email])
      end

      r.root do
        if rodauth.logged_in?
          @active_games = player.active_games.map{|id, players| ["#{id} - #{players}", id]}
          @finished_games = player.finished_games.map{|id, players| ["#{id} - #{players}", id]}
          :home
        else
          :index
        end
      end

      next unless player

      r.get "stats", :param => 'login' do |email|
        @other_player = Player.from_email(email)
        @stats = player.stats(@other_player)
        :stats
      end

      r.on "game" do
        r.is :param => 'id' do |game_id|
          r.redirect "/game/#{game_id.to_i}"
        end

        r.post "new" do
          email_str = r['emails']

          if TEST_MODE
            email_str, tiles = email_str.split(':', 2)
            tiles = JSON.parse(tiles) if tiles
          end

          emails = email_str.split(',')
          players = emails.map{|email| Player.from_email(email)}
          players.unshift(player)

          emails = players.map(&:email)
          unless emails.length == emails.uniq.length
            raise Error, "cannot have same player in two separate positions"
          end

          game_state = if tiles
            Game.start_with_tiles(players, tiles)
          else
            Game.start(players)
          end

          r.redirect("/game/#{game_state.game.id}")
        end

        r.on :d do |game_id|
          game_id = game_id.to_i

          r.message_bus

          r.get true do
            game_state = game_state_from_request(game_id)
            @players = game_state.game.player_emails
            @position = game_state.game.player_position(player)
            @game_id = game_state.game.id
            :board
          end

          r.get "check" do
            game_state = game_state_from_request(game_id)
            update_actions_json(game_state)
          end

          r.get "state", :d do |move_count|
            game_state = game_state_from_request(game_id, move_count.to_i)
            update_actions_json(game_state, :previous=>true)
          end

          r.post "pass" do
            move_or_pass(game_id, &:pass)
          end

          r.post "move" do
            move_or_pass(game_id){|game_state| game_state.move(r['move'])}
          end
        end
      end
    end

    attr_reader :player

    UPDATE_ACTIONS_KEYS = {:board=>:board, :scores=>:scores, :to_move=>:toMove, :pass_count=>:passCount, :move_count=>:moveCount, :game_over=>:gameOver}.freeze
    def update_actions_json(game_state, opts={})
      state = {}
      UPDATE_ACTIONS_KEYS.each{|k,v| state[v] = game_state[k]}
      state["rack"] = game_state.racks[game_state.game.player_position(player)]
      json = [{"action"=>"updateInfo", "state"=>state, "lastPlay"=>game_state.last_play}]

      if game_state.game_over
        json << {"action"=>"gameOver", "winners"=>game_state.winners}
      elsif player.id != game_state.player_to_move.id
        json << poll_json(game_state.move_count)
      end

      if opts[:previous]
        json << {"action"=>"previousState"}
      else
        json << {"action"=>"activeState"}
      end
      
      json
    end

    def poll_json(move_count)
      {"action"=>"poll"}
    end

    def game_state_from_request(game_id, move_count=nil)
      unless game = Game.from_id_player(game_id, player.id)
        raise Error, "invalid game for player"
      end
      
      game.state(move_count)
    end

    def move_or_pass(game_id)
      game_state = game_state_from_request(game_id)

      if game_state.game_over?
        raise Error, "Game already ended"
      end

      unless player.id == game_state.player_to_move.id
        raise Error, "Not your turn to move #{player.id} #{game_state.player_to_move.id}"
      end

      game_state = yield(game_state)
      game_state.persist

      MessageBus.publish("/game/#{game_id}", 'null')
      update_actions_json(game_state)
    end
  end
end
